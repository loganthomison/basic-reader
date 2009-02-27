<?xml version="1.0" encoding="UTF-8"?>

<!--
    Stylesheet for transformation of verb form conjugation 
    data to HTML
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" exclude-result-prefixes="xs"
    xmlns:exsl="http://exslt.org/common"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <xsl:import href="alph-infl-form.xsl"/>
    <xsl:import href="alph-infl-match.xsl"/>
    <xsl:import href="alph-infl-extras.xsl"/>
    <!--
        This stylesheet groups the data on 3 attributes for the rows, 
        and groups on 3 attributes for the columns.
        Grouping attributes are supplied as parameters.
        Grouping parameters are required.
        A optional ending parameter can be used to identify the ending
        to be indicated as 'selected' in the HTML table.     
    -->
    
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    
    <xsl:strip-space elements="*"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
                
    <!-- all parameters may be supplied in transformation -->
    <xsl:param name="filter_by" select="'voice=active'"/>
     
    <!-- row groupings -->     
    <xsl:param name="group1" select="'mood'"/>
    <xsl:param name="group2" select="'num'"/>
    <xsl:param name="group3" select="'pers'"/>
    
    <!-- column groupings -->
    <xsl:param name="group4" select="'tense'"/>

    <!-- the following are optional, used to select specific inflection ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    <xsl:param name="form" />
    
    <!-- by default greek vowel length is stripped but this can be overridden -->
    <xsl:param name="strip_greek_vowel_length" select="true()"/>
    
    <!-- transliterate unicode in the ending tables before matching? -->
    <xsl:param name="translit_ending_table_match" select="false()"/>
    <!-- by default this stylesheet applies to verbs, but may also be
         used for adjectives or other parts of speech -->
    <xsl:param name="match_pofs" select="'verb'"/>
    
    <!-- Flag to request that only the endings which match the form exactly be
         included in the table
    -->
    <xsl:param name="show_only_matches" select="false()"/>
        
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
        
    <xsl:template match="/infl-data">
        <xsl:variable name="table-notes">
            <xsl:if test="@footnote">
                <div id="table-notes">
                <xsl:call-template name="add-footnote">
                    <xsl:with-param name="item" select="."/>
                </xsl:call-template>
                </div>
            </xsl:if>    
        </xsl:variable>
        
        <xsl:variable name="filter_key" select="substring-before($filter_by,'=')"/>
        <xsl:variable name="filter_val" select="substring-after($filter_by,'=')"/>
        
        <!-- filter the form set data by the attribute name/value pair identified 
             in the parameters
        -->
        <xsl:variable name="data" select="//infl-form-set/@*[local-name(.)=$filter_key
        and .= $filter_val]/.."/>
        
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:copy-of select="$table-notes"/>
                <xsl:call-template name="infltable">
                    <xsl:with-param name="endings" select="$data"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-{$match_pofs}.css"/>
                    </head>
                    <body>
                        <xsl:copy-of select="$table-notes"/>
                        <xsl:call-template name="infltable">
                            <xsl:with-param name="endings" select="$data"/>
                        </xsl:call-template>                     
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
     
    <xsl:template name="infltable">
        <xsl:param name="endings" />
        <table id="alph-infl-table"> <!-- start table -->
            <caption>
                <xsl:for-each select="$selected_endings//span[@class='alph-term']">
                    <xsl:if test="position() &gt; 1">
                        , 
                    </xsl:if>
                    <div class="alph-infl-term"><xsl:copy-of select="current()"/></div>    
                </xsl:for-each>                
                <xsl:if test="$filter_by">
                    <div class="alph-infl-filter">
                        <xsl:value-of select="translate($filter_by,'=',': ')"/>
                    </div>
                </xsl:if>
            </caption>
            <!-- write the colgroup elements -->
            <xsl:call-template name="colgroups">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
            </xsl:call-template>        
            <!-- write the column header rows -->
            <xsl:call-template name="headers">
                <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
            </xsl:call-template>
            <!-- gather first level row grouping:
                all attribute values for group1 attribute -->
            <xsl:variable name="firstgroup" select="$endings/@*[local-name(.)=$group1]"/>
            <!-- iterate though the items in the first group -->
            <xsl:for-each select="$firstgroup">
                <!-- lookup sort order for this attribute from order-table in the inflection data -->
                <xsl:sort 
                    select="/infl-data/order-table/order-item[@attname=$group1 
                    and text()=current()]/@order" 
                    data-type="number"/>
                <!-- if this is the first instance of this attribute value proceed to 
                    2nd level grouping -->
                <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                    <xsl:variable name="lastgroup1" select="."/>
                    <!-- gather second level row grouping:
                        all group2 attribute values 
                        from all elements whose group1 attribute matches the current group1 value  
                    -->                    
                    <xsl:variable name="secondgroup" 
                        select="$endings/@*[local-name(.)=$group1 
                        and .=$lastgroup1]/../@*[local-name(.)=$group2]"/>                    
                    <!-- first instance of group1 row so add header row -->
                    <!-- TODO colspan should not be hardcoded -->
                    <tr id="header-{$lastgroup1}" class="group1row">
                        <th class="header-text always-visible" colspan="2">
                            <xsl:value-of select="$lastgroup1"/>
                            <xsl:call-template name="add-footnote">
                                <xsl:with-param name="item"
                                    select="/infl-data/order-table/order-item[@attname=$group1 
                                    and text()=$lastgroup1]" />
                            </xsl:call-template>                            
                        </th>
                        <xsl:call-template name="headerrow">
                            <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                        </xsl:call-template>        
                    </tr>                    
                    <!-- iterate through the items in the second group -->
                    <xsl:for-each select="$secondgroup">
                        <xsl:sort select="/infl-data/order-table/order-item[@attname=$group2 
                            and text()=current()]/@order" data-type="number"/>
                            <!-- start a new row to hold the data if this is the first instance of 
                                this attribute value -->
                            <xsl:if test="generate-id(.) = generate-id($secondgroup[.=current()])">
                                <xsl:variable name="lastgroup2" select="."/>
                                <!-- gather third level row grouping:
                                    all group3 attribute values 
                                    from all elements whose group1 attribute 
                                    matches the current group1 value and
                                    whose group2 attribute value matches the current
                                    group2 value
                                -->                    
                                <xsl:variable name="thirdgroup" 
                                    select="$endings/@*[local-name(.)=$group1 
                                    and .=$lastgroup1]/../
                                    @*[local-name(.)=$group2 and .=$lastgroup2]/../@*[local-name(.)=$group3]"/>           
                                <xsl:variable name="row_id" select="concat($lastgroup1,$lastgroup2)"/>
                                <!-- first instance of group2 row so add header row -->
                                <tr id="{concat('header-',$lastgroup2,$lastgroup2)}" class="group2row">
                                    <th class="header-text always-visible" colspan="2">
                                        <xsl:value-of select="$lastgroup2"/>
                                        <xsl:call-template name="add-footnote">
                                            <xsl:with-param name="item"
                                                select="/infl-data/order-table/order-item[@attname=$group2 
                                                and text()=$lastgroup2]" />
                                        </xsl:call-template>                            
                                    </th>
                                    <xsl:call-template name="headerrow">
                                        <xsl:with-param name="headerrow1" select="//order-item[@attname=$group4]"/>
                                    </xsl:call-template>        
                                </tr>                    
                                <xsl:comment><xsl:value-of select="count($thirdgroup)"/></xsl:comment>
                                <xsl:for-each select="$thirdgroup">
                                    <xsl:sort select="/infl-data/order-table/order-item[@attname=$group3 
                                        and text()=current()]/@order" data-type="number"/>
                                    <!-- start a new row to hold the data if this is the first instance of 
                                        this attribute value -->
                                    <xsl:if test="generate-id(.) = generate-id($thirdgroup[.=current()])">
                                        <xsl:variable name="lastgroup3" select="."/>
                                        <tr class="data-row" id="{concat($lastgroup1,$lastgroup2,$lastgroup3)}"> <!-- start new row -->
                                            <th class="emptyheader">&#160;</th>
                                                <!-- gather the actual ending data in this grouping:
                                                     all elements whose 
                                                    - group1 attribute matches the current group1 value and
                                                    - group2 attribute matches the current group2 value
                                                    - group3 attribute matches the current group3 value
                                                -->
                                            <xsl:variable name="data"
                                                select="$endings/@*[local-name(.)=$group1 
                                                and .=$lastgroup1]/../@*[local-name(.)=$group2 
                                                and . = $lastgroup2]/../@*[local-name(.)=$group3
                                                and .= $lastgroup3]/.."/>
                                            <xsl:call-template name="rowgroup">
                                                <xsl:with-param name="data" select="$data"/>
                                                <xsl:with-param name="groupheader" select="$lastgroup3"/>
                                            </xsl:call-template>
                                        </tr> 
                                    </xsl:if>
                            </xsl:for-each>                                  
                        </xsl:if>
                    </xsl:for-each>
                </xsl:if>
            </xsl:for-each>
        </table> <!-- end infl table -->
    </xsl:template>
    
    <!-- template to write a group of rows of infl-ending data to the table -->
    <xsl:template name="rowgroup">
        <xsl:param name="data"/>
        <xsl:param name="groupheader"/>
        <xsl:variable name="group4_vals" select="//order-item[@attname=$group4]"/>
        <xsl:for-each select="$group4_vals">
            <xsl:sort 
                select="@order"/>
            <xsl:variable name="lastgroup4" select="."/>
            <xsl:if test="position()=1">
                <!-- add the row header cell if it's the first cell in 
                    the row -->
                <th class="rowgroupheader header-text">
                    <xsl:value-of select="$groupheader"/>
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="/infl-data/order-table/order-item[@attname=$groupheader]"/>
                    </xsl:call-template>
                </th>
            </xsl:if>
            <xsl:variable name="celldata"
                select="$data/@*[local-name(.)=$group4 
                and .=$lastgroup4]/.."/>
            <xsl:comment><xsl:value-of select="$lastgroup4"/></xsl:comment>                    
            <xsl:variable name="selected">
                <xsl:call-template name="check_infl_sets">
                    <xsl:with-param name="current_data" select="$celldata" />
                    <xsl:with-param name="selected_endings" select="$selected_endings"/>
                    <xsl:with-param name="match_pofs" select="$match_pofs"/>
                    <xsl:with-param name="strip_greek_vowel_length" select="$strip_greek_vowel_length"/>
                </xsl:call-template>
            </xsl:variable>
            <xsl:variable name="context">
                <xsl:call-template name="infl-set-context">
                    <xsl:with-param name="infl_set" select="$celldata"/>
                </xsl:call-template>
            </xsl:variable>                                
            <xsl:call-template name="ending-cell">
                <xsl:with-param name="infl-endings" select="$celldata"/>
                <xsl:with-param name="selected" select="$selected"/>
                <xsl:with-param name="selected_endings" select="$selected_endings"/>
                <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                <xsl:with-param name="strip_greek_vowel_length" select="$strip_greek_vowel_length"/>
                <xsl:with-param name="show_only_matches" select="$show_only_matches"/>
                <xsl:with-param name="context" select="$context"/>
            </xsl:call-template>
        </xsl:for-each>
    </xsl:template>
    
    
    <!-- template to produce header rows for the table columns -->    
    <xsl:template name="headers">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <xsl:param name="headerrow3"/>
        <tr id="headerrow1" class="expand-ctl">
            <th colspan="2" class="always-visible">
                <span class="header-text"><xsl:value-of select="$group4"/></span>    
                <xsl:call-template name="stem-header">
                    <xsl:with-param name="header" select="$group4"/>
                </xsl:call-template>                
            </th>        
            <xsl:for-each select="$headerrow1">
                <xsl:sort select="@order" data-type="number"/>
                <th>
                    <span class="header-text"><xsl:value-of select="."/></span>
                    <xsl:apply-templates select="."/>
                </th>
            </xsl:for-each>            
        </tr>
    </xsl:template>
    
    
    
    <!-- template to produce colgroups for the table columns -->
    <xsl:template name="colgroups">
        <xsl:param name="headerrow1"/>
        <xsl:param name="headerrow2"/>
        <colgroup class="leftheader">
            <col realIndex="0"/>
            <col realIndex="1"/>
        </colgroup>
        <colgroup class="header1">                          
            <xsl:for-each select="$headerrow1">
                <xsl:variable name="row1pos" select="position()-1"/>            
                    <xsl:variable name="index" select="position() + 1"/>
                    <col class="header2col" realIndex="{$index}"/>
            </xsl:for-each>
        </colgroup>        
    </xsl:template>
    
    <xsl:template name="headerrow">
        <xsl:param name="headerrow1"/>
        <xsl:for-each select="$headerrow1">
            <td>&#160;</td>
        </xsl:for-each>       
    </xsl:template>
                
</xsl:stylesheet>
