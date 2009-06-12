<?xml version="1.0" encoding="UTF-8"?>
<!-- produces table cells to hold the endings in inflection ending set, grouped by ending
     type (e.g. regular, irregular). Each type gets its own cell.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    <xsl:template name="ending-cell">
        <xsl:param name="infl-endings"/>
        <xsl:param name="selected_endings"/>
        <xsl:param name="selected"/>
        <xsl:param name="translit_ending_table_match" />
        <xsl:param name="normalize_greek"/>
        <xsl:param name="dedupe_by"/>
        <xsl:param name="show_only_matches"/>
        <xsl:param name="group_by"/>
        <xsl:param name="no_grouping" select="false()"/>
        <xsl:param name="match_form"/>
        <xsl:param name="text_for_match"/>
        
        <xsl:variable name="group_att">
            <xsl:choose>
                <xsl:when test="$group_by">
                    <xsl:value-of select="$group_by"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="'type'"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        
        <xsl:variable name="ending_types" select="//order-item[@attname=$group_att]"/>
        <xsl:choose>
            <xsl:when test="$no_grouping">
                <td class="ending-group">
                    <xsl:for-each select="$infl-endings/infl-ending">
                        <xsl:call-template name="print-inflection">
                            <xsl:with-param name="inflection" select="."/>
                            <xsl:with-param name="selected" select="$selected"/>
                            <xsl:with-param name="selected_endings" select="$selected_endings"/>
                            <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                            <xsl:with-param name="normalize_greek" select="$normalize_greek"/>
                            <xsl:with-param name="dedupe_by" select="$dedupe_by"/>
                            <xsl:with-param name="show_only_matches" select="$show_only_matches"/>
                            <xsl:with-param name="group_by" select="$group_by"/>
                            <xsl:with-param name="match_form" select="$match_form"/>
                            <xsl:with-param name="text_for_match" select="$text_for_match"/>
                        </xsl:call-template>                        
                    </xsl:for-each> 
                </td>
            </xsl:when>
            <xsl:otherwise>
                <!-- group by type -->
                <xsl:for-each select="$ending_types">
                    <xsl:sort 
                        select="/infl-data/order-table/order-item[@attname=$group_att
                        and text()=current()]/@order"/>
                    <xsl:if test="generate-id(.) = generate-id($ending_types[.=current()])">
                        <xsl:variable name="lasttype" select="."/>
                        <td class="ending-group {$lasttype}"> <!-- start new cell -->
                            <xsl:variable name="cellgroup" 
                                select="$infl-endings/infl-ending/@*[local-name(.)=$group_att
                                and contains(concat(' ',(.),' '), concat(' ',$lasttype,' '))]/.."/>
                            <!-- print an empty cell if there are no endings of this type -->
                            <xsl:if test="count($cellgroup) = 0"><span class="emptycell">&#160;</span></xsl:if>
                            <xsl:for-each select="$cellgroup">
                                <xsl:call-template name="print-inflection">
                                    <xsl:with-param name="inflection" select="."/>
                                    <xsl:with-param name="selected" select="$selected"/>
                                    <xsl:with-param name="selected_endings" select="$selected_endings"/>
                                    <xsl:with-param name="translit_ending_table_match" select="$translit_ending_table_match"/>
                                    <xsl:with-param name="normalize_greek" select="$normalize_greek"/>
                                    <xsl:with-param name="dedupe_by" select="$dedupe_by"/>
                                    <xsl:with-param name="show_only_matches" select="$show_only_matches"/>
                                    <xsl:with-param name="group_by" select="$group_by"/>
                                    <xsl:with-param name="match_form" select="$match_form"/>
                                    <xsl:with-param name="text_for_match" select="$text_for_match"/>
                                </xsl:call-template>
                            </xsl:for-each>
                        </td>                                   
                    </xsl:if>
                </xsl:for-each>                
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template name="print-inflection">
        <xsl:param name="inflection"/>
        <xsl:param name="selected"/>
        <xsl:param name="selected_endings"/>
        <xsl:param name="translit_ending_table_match" />
        <xsl:param name="normalize_greek"/>
        <xsl:param name="dedupe_by"/>
        <xsl:param name="show_only_matches"/>
        <xsl:param name="group_by"/>
        <xsl:param name="match_form"/>
        <xsl:param name="text_for_match"/>
        <xsl:variable name="stripped-ending">
            <xsl:choose>
                <!-- if requested, transliterate the ending in the table for matching -->
                <xsl:when test="$translit_ending_table_match">
                    <xsl:call-template name="uni-to-ascii">
                        <xsl:with-param name="input" select="."/>
                    </xsl:call-template>
                </xsl:when>
                <!-- otherwise use the ending as-is -->
                <xsl:otherwise>
                    <xsl:value-of select="."/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <!-- underscore and hyphen in the declension tables match on no ending -->
        <xsl:variable name="ending_match">
            <xsl:choose>
                <xsl:when test="$stripped-ending = '_' or $stripped-ending = '-'">_</xsl:when>
                <xsl:otherwise>
                    <xsl:choose>
                        <xsl:when test="$normalize_greek">
                            <xsl:call-template name="normalize-greek">
                                <xsl:with-param name="input" select="normalize-space($stripped-ending)"/>
                                <xsl:with-param name="strip">\/^_</xsl:with-param>
                            </xsl:call-template>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="normalize-space($stripped-ending)"/>        
                        </xsl:otherwise>
                    </xsl:choose>
                    
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="selected_class">
            <xsl:choose>
                <!-- if this inflection-set is selected by it's attributes AND
                    a) the ending matches the one supplied in the template params
                    OR
                    b) the template params didn't identify the ending
                    then add a 'selected' class to the data element -->
                <xsl:when test="contains($selected,concat(',',$ending_match,','))
                    or ($selected != '' and not($selected_endings//span[@class='alph-term']))">selected</xsl:when>
                <!-- otherwise add the class 'matched' to indicate that the ending matches but
                    the form attributes don't -->
                <xsl:otherwise>
                    <xsl:if test="contains($text_for_match,concat('|',$ending_match,'|'))">matched</xsl:if>
                </xsl:otherwise>        
            </xsl:choose>                                                                                
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="$show_only_matches and $selected_class=''">
                <span class="skipending">&#160;</span>                                
            </xsl:when>
            <xsl:otherwise>
                <xsl:variable name="notfirst">
                    <xsl:if test="position() &gt; 1">notfirst</xsl:if>
                </xsl:variable>
                <xsl:variable name="this_case" select="../@case"/>
                <xsl:variable name="this_num" select="../@num"/>
                <xsl:variable name="this_gend" select="../@gend"/>
                <xsl:variable name='duplicate'>
                    <xsl:if test="$dedupe_by='case-num-gend'
                        and ../preceding-sibling::infl-ending-set[@case=$this_case and 
                        @gend = $this_gend and @num = $this_num]/infl-ending/text() = .">duplicate</xsl:if>
                </xsl:variable>                                       
                <span class="ending {@type} {$selected_class} {$notfirst} {$duplicate}" 
                    stem-class="{@stem-class}">
                    <xsl:value-of select="."/>
                </span>
                <xsl:call-template name="add-dialect">
                    <xsl:with-param name="item" select="."/>
                </xsl:call-template>                        
                <xsl:call-template name="add-footnote">
                    <xsl:with-param name="item" select="."/>
                </xsl:call-template>                                
            </xsl:otherwise>
        </xsl:choose>        
    </xsl:template>

</xsl:stylesheet>