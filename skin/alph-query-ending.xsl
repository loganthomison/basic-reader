<?xml version="1.0" encoding="UTF-8"?>
<!-- produces table cells to hold the endings in inflection ending set, grouped by ending
     type (e.g. regular, irregular). Each type gets its own cell.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    
    <xsl:template name="ending-cell">
        <xsl:param name="infl-endings"/>
        <xsl:param name="selected_endings"/>
        <xsl:param name="selected"/>
        <xsl:param name="translit_ending_table_match" />
        <xsl:param name="strip_greek_vowel_length" />
        <xsl:param name="dedupe_by"/>
        <xsl:param name="show_only_matches"/>
        <xsl:param name="context"/>
        <xsl:param name="match_form"/>
        
        <xsl:variable name="infl_set" select="$infl-endings/../infl-set"/>
                
        <td class="ending-group"> <!-- start new cell -->
        <xsl:variable name="cellgroup" 
            select="$infl-endings/infl-ending[contains(@type,'primary')]"/>
            <xsl:if test="count($cellgroup) = 0">
                <span class="emptycell"/>
            </xsl:if>
        <xsl:for-each select="$cellgroup">
            <xsl:variable name="stripped-ending">
                <xsl:choose>
                    <!-- if requested, transliterate the ending in the table for matching -->
                    <xsl:when test="$translit_ending_table_match">
                        <xsl:call-template name="uni-to-ascii">
                            <xsl:with-param name="input" select="."/>
                        </xsl:call-template>
                    </xsl:when>
                    <!-- if we're not transliterating, we may need to   
                         strip greek vowels -->
                    <xsl:when test="$strip_greek_vowel_length = true()">
                        <xsl:call-template name="uni-strip">
                            <xsl:with-param name="input" select="."/>
                            <xsl:with-param name="strip-vowels" select="true()"/>
                            <xsl:with-param name="strip-diaereses" select="false()"/>
                            <xsl:with-param name="strip-caps" select="false()"/>
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
                        <xsl:value-of select="normalize-space($stripped-ending)"/>
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
                        <xsl:choose>
                            <xsl:when test="$strip_greek_vowel_length = true()
                                and count
                                ($selected_endings//span
                                [@class='alph-suff' and 
                                translate(text(),
                                $uni-with-length,
                                $uni-without-length) 
                                = $ending_match]
                                ) &gt; 0">matched</xsl:when>
                            <xsl:when test="$strip_greek_vowel_length = false()
                                and count
                                ($selected_endings//span
                                [@class='alph-suff' and 
                                text() = $ending_match]
                                ) &gt; 0">matched</xsl:when>
                            <xsl:when test="$selected_endings//span[@class='alph-term']/span[@class='alph-suff' and not(text())]
                                and $ending_match = '_'">matched</xsl:when>
                        </xsl:choose>  
                    </xsl:otherwise>        
                </xsl:choose>                                                                                
            </xsl:variable>
            <xsl:variable name="notfirst">
                <xsl:if test="position() &gt; 1">notfirst</xsl:if>
            </xsl:variable>
            <xsl:variable name="this_case" select="../@case"/>
            <xsl:variable name="this_num" select="../@num"/>
            <xsl:variable name="this_gend" select="../@gend"/>
            <span class="ending {@type} {$selected_class} {$notfirst}" 
                stem-class="{@stem-class}"
                context="{translate($context,' ','_')}">
                <xsl:value-of select="."/>
            </span>
        </xsl:for-each>
        </td>                                   
    </xsl:template>
    

</xsl:stylesheet>